import java.io.FileWriter;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Random;

public class CCTransactionGenerator {

    public static void main(String[] args) {

        int numTransactions = 1000;

        String[] merchants = {"Walmart", "Amazon", "Target", "BestBuy", "GasStation"};
        String[] locations = {"NY", "CA", "TX", "FL", "NJ"};

        Random rand = new Random();

        // Track past behavior per card
        HashMap<Long, LocalDateTime> lastTime = new HashMap<>();
        HashMap<Long, String> lastLocation = new HashMap<>();

        try {
            FileWriter writer = new FileWriter("transactions.csv");

            // Updated header
            writer.append(
                "transaction_id,card_number,timestamp,merchant,location,amount,is_potential_fraud\n"
            );

            for (int i = 1; i <= numTransactions; i++) {

                int transactionId = i;

                long cardNumber = 4000000000000000L +
                        (long)(rand.nextDouble() * 1000000000000000L);

                LocalDateTime time = LocalDateTime.now()
                        .minusMinutes(rand.nextInt(60 * 24 * 30));

                String formattedTime = time.format(
                        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

                String merchant = merchants[rand.nextInt(merchants.length)];
                String location = locations[rand.nextInt(locations.length)];

                double amount = 1 + (2000 - 1) * rand.nextDouble();
                amount = Math.round(amount * 100.0) / 100.0;

                int isPotentialFraud = 0;

                // -------- FRAUD PATTERN RULES --------

                // High amount spike
                if (amount > 1700) {
                    isPotentialFraud = 1;
                }

                // Rapid transactions
                if (lastTime.containsKey(cardNumber)) {
                    long minutes =
                        java.time.Duration.between(lastTime.get(cardNumber), time)
                                .toMinutes();

                    if (minutes < 3) {
                        isPotentialFraud = 1;
                    }
                }

                // Location jump
                if (lastLocation.containsKey(cardNumber)) {
                    String prevLoc = lastLocation.get(cardNumber);

                    if (!prevLoc.equals(location)) {
                        isPotentialFraud = 1;
                    }
                }

                // Fraud burst injection
                if (rand.nextDouble() < 0.01) {

                    for (int j = 0; j < 5; j++) {

                        LocalDateTime burstTime = time.plusSeconds(j * 30);

                        double burstAmount = 1500 + rand.nextDouble() * 500;
                        burstAmount = Math.round(burstAmount * 100.0) / 100.0;

                        writer.append(transactionId + j + ","
                                + cardNumber + ","
                                + burstTime.format(
                                        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) + ","
                                + merchant + ","
                                + location + ","
                                + String.format("%.2f", burstAmount) + ","
                                + 1 + "\n");
                    }
                }

                // Save history
                lastTime.put(cardNumber, time);
                lastLocation.put(cardNumber, location);

                // Write normal transaction
                writer.append(transactionId + ","
                        + cardNumber + ","
                        + formattedTime + ","
                        + merchant + ","
                        + location + ","
                        + String.format("%.2f", amount) + ","
                        + isPotentialFraud + "\n");
            }

            writer.close();
            System.out.println(
                "transactions.csv generated with potential fraud patterns."
            );

        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
