import java.io.BufferedReader;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;

public class FraudProbabilityChecker {

    public static void main(String[] args) {

        String inputFilePath = "transactions.csv";
        String outputFilePath = "suspicious_transactions.txt";

        String line;
        DateTimeFormatter formatter =
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        // Track history per card
        HashMap<Long, LocalDateTime> lastTime = new HashMap<>();
        HashMap<Long, String> lastLocation = new HashMap<>();

        try (BufferedReader br = new BufferedReader(new FileReader(inputFilePath));
             FileWriter writer = new FileWriter(outputFilePath)) {

            // Skip header
            br.readLine();

            writer.write("Likely Fraud Transactions:\n\n");

            while ((line = br.readLine()) != null) {

                String[] data = line.split(",");

                int transactionId = Integer.parseInt(data[0]);
                long cardNumber = Long.parseLong(data[1]);
                LocalDateTime time =
                        LocalDateTime.parse(data[2], formatter);
                String merchant = data[3];
                String location = data[4];
                double amount = Double.parseDouble(data[5]);

                double fraudScore = 0.0;

                //  PATTERN CHECKS 

                // 1. High amount
                if (amount > 1700) {
                    fraudScore += 0.3;
                }

                // 2. Rapid transactions
                if (lastTime.containsKey(cardNumber)) {

                    long minutes =
                            Duration.between(lastTime.get(cardNumber), time)
                                    .toMinutes();

                    if (minutes < 3) {
                        fraudScore += 0.5;
                    }
                }

                // 3. Location change
                if (lastLocation.containsKey(cardNumber)) {

                    String prevLoc = lastLocation.get(cardNumber);

                    if (!prevLoc.equals(location)) {
                        fraudScore += 0.3;
                    }
                }

                // Save history
                lastTime.put(cardNumber, time);
                lastLocation.put(cardNumber, location);

                // Convert to %
                double probability = fraudScore * 100;

                // Only print/save suspicious ones
                if (probability >= 50) {
                    String outputLine = "Transaction ID: " + transactionId +
                            " | Card: " + cardNumber +
                            " | Amount: $" + String.format("%.2f", amount) +
                            " | Location: " + location +
                            " | Fraud Probability: " + probability + "%\n";

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
