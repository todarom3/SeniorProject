import java.io.BufferedReader;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class FraudProbabilityChecker {

    public static void main(String[] args) {

        String inputFilePath = "transactions2.csv";
        String outputFilePath = "suspicious_transactions.txt";

        DateTimeFormatter formatter =
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        // Track per-card behavior
        HashMap<Long, LocalDateTime> lastTime = new HashMap<>();
        HashMap<Long, String> lastLocation = new HashMap<>();
        HashMap<Long, List<Double>> recentSmallCharges = new HashMap<>();
        HashMap<Long, LinkedList<LocalDateTime>> recentTimes = new HashMap<>();

        try (BufferedReader br = new BufferedReader(new FileReader(inputFilePath));
             FileWriter writer = new FileWriter(outputFilePath)) {

            br.readLine(); // skip header
            writer.write("Likely Fraud Transactions:\n\n");

            String line;
            while ((line = br.readLine()) != null) {

                String[] data = line.split(",");
                int transactionId = Integer.parseInt(data[0]);
                long cardNumber = Long.parseLong(data[1]);
                LocalDateTime time = LocalDateTime.parse(data[2], formatter);
                String merchant = data[3];
                String location = data[4];
                double amount = Double.parseDouble(data[5]);

                double fraudScore = 0.0;
                List<String> reasons = new ArrayList<>();

                // Initialize per-card tracking
                recentSmallCharges.putIfAbsent(cardNumber, new ArrayList<>());
                recentTimes.putIfAbsent(cardNumber, new LinkedList<>());

                LinkedList<LocalDateTime> times = recentTimes.get(cardNumber);
                times.add(time);

                // Keep last 5 transactions only
                if (times.size() > 5) times.removeFirst();

                // ---------------- HIGH AMOUNT ----------------
                if (amount > 1500) {
                    fraudScore += 0.3;
                    reasons.add("Unusually high purchase amount");
                }

                // ---------------- RAPID TRANSACTIONS ----------------
                if (lastTime.containsKey(cardNumber)) {
                    long minutes = Duration.between(lastTime.get(cardNumber), time).toMinutes();

                    if (minutes >= 0 && minutes < 3) {
                        fraudScore += 0.6;
                        reasons.add("Rapid consecutive transactions");
                    }

                    // ---------------- LOCATION JUMP ----------------
                    if (minutes >= 0 && minutes < 1 &&
                            lastLocation.containsKey(cardNumber) &&
                            !lastLocation.get(cardNumber).equals(location)) {

                        fraudScore += 0.6;
                        reasons.add("Location jump within short time");
                    }
                }

                // ---------------- LATE NIGHT RAPID ----------------
                if (time.getHour() >= 0 && time.getHour() <= 5) {
                    if (times.size() >= 2) {
                        long diff = Duration.between(times.get(times.size() - 2), time).toMinutes();
                        if (diff >= 0 && diff < 3) {
                            fraudScore += 0.5;
                            reasons.add("Late night rapid spending");
                        }
                    }
                }

                // ---------------- TEST CHARGE PATTERN ----------------
                List<Double> smalls = recentSmallCharges.get(cardNumber);

                if (amount < 5) {
                    smalls.add(amount);
                } else if (!smalls.isEmpty() && smalls.size() >= 2 && amount > 800) {
                    fraudScore += 0.7;
                    reasons.add("Small test charges followed by large purchase");
                    smalls.clear(); // reset after detection
                } else {
                    // clear if random unrelated charge occurs
                    if (smalls.size() > 3) smalls.clear();
                }

                // ---------------- BURST DETECTION ----------------
                if (times.size() >= 5) {
                    long diff = Duration.between(times.getFirst(), times.getLast()).toMinutes();
                    if (diff >= 0 && diff < 2) {
                        fraudScore += 0.6;
                        reasons.add("Multiple transactions in short burst");
                    }
                }

                // Update last transaction info
                lastTime.put(cardNumber, time);
                lastLocation.put(cardNumber, location);

                // Convert score to percent
                double probability = Math.min(fraudScore * 100, 100);

                if (probability >= 30) {
                    String outputLine =
                            "Transaction ID: " + transactionId +
                                    " | Card: " + cardNumber +
                                    " | Amount: $" + String.format("%.2f", amount) +
                                    " | Location: " + location +
                                    " | Fraud Probability: " + probability + "%\n" +
                                    "Reason(s): " + String.join(", ", reasons) +
                                    "\n\n";

                    System.out.print(outputLine);
                    writer.write(outputLine);
                }
            }

            System.out.println("\nSuspicious transactions saved to: " + outputFilePath);

        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}